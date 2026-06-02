import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStore } from '../stores/offlineStore';
import { offlineDb } from '../db/offlineDatabase';
import { detectConflict, getHourBucket } from '../db/conflictDetection';
import { samplesApi } from '../api/samples';
import type { CreateSampleInput } from '../types';

export interface UseOfflineSubmissionReturn {
  submit: (data: CreateSampleInput) => Promise<{
    success: boolean;
    offline?: boolean;
    error?: string;
    recordId?: string;
    serverId?: string;
  }>;
  isSubmitting: boolean;
}

export function useOfflineSubmission(): UseOfflineSubmissionReturn {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateSampleInput) => samplesApi.create(data),
  });

  const submit = async (data: CreateSampleInput) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const hourBucket = getHourBucket(now);

    // Build a candidate record so we can run conflict detection first
    const newRecord = {
      id,
      sourceType: 'sample' as const,
      payload: data,
      createdAt: now,
      syncedAt: null,
      retryCount: 0,
      lastError: null,
      status: 'pending_sync' as const,
      hourBucket,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      purgedAt: null,
    };

    // Always run conflict detection BEFORE submitting (online or offline)
    const conflict = await detectConflict(newRecord);
    if (conflict.isDuplicate) {
      return {
        success: false,
        error: conflict.reason || 'Duplicate submission detected',
      };
    }

    if (isOnline) {
      try {
        const response = await createMutation.mutateAsync(data);
        // Save as synced record to Dexie for local history
        await offlineDb.offlineRecords.add({
          ...newRecord,
          status: 'synced',
          syncedAt: now,
        });
        await offlineDb.syncLog.add({
          recordId: id,
          action: 'success',
          timestamp: now,
          details: `Online submission (server ID: ${response.id})`,
        });
        queryClient.invalidateQueries({ queryKey: ['samples'] });
        return { success: true, recordId: id, serverId: response.id };
      } catch (error: unknown) {
        // Online submission failed — fall through to offline queue
        console.error('Online submission failed, saving to offline queue:', error);
      }
    }

    // Save to Dexie as pending_sync (offline or online-fallback)
    await offlineDb.offlineRecords.add({
      ...newRecord,
      status: 'pending_sync',
    });
    await offlineDb.syncLog.add({
      recordId: id,
      action: 'enqueue',
      timestamp: now,
      details: isOnline ? 'Online failed, queued for retry' : 'Offline, queued for sync',
    });

    return { success: true, offline: !isOnline, recordId: id };
  };

  return {
    submit,
    isSubmitting: createMutation.isPending,
  };
}
