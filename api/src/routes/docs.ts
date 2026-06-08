import { Router, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Water Quality Crowdsource API',
    version: '1.0.0',
    description: 'API for collecting and managing water quality data from field researchers at Mangrove Wonorejo, Surabaya.',
    contact: {
      name: 'Research Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
  ],
  components: {
    schemas: {
      Sample: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          authorName: { type: 'string' },
          ph: { type: 'number', nullable: true },
          temperature: { type: 'number', nullable: true },
          conductivity: { type: 'number', nullable: true },
          salinity: { type: 'number', nullable: true },
          nitrate: { type: 'number', nullable: true },
          calcium: { type: 'number', nullable: true },
          potassium: { type: 'number', nullable: true },
          sodium: { type: 'number', nullable: true },
          waterBodyType: { type: 'string' },
          landUse: { type: 'string' },
          gpsAccuracy: { type: 'number', nullable: true },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Location: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          address: { type: 'string', nullable: true },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  paths: {},
};

const isDev = process.env.NODE_ENV !== 'production';

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: [isDev ? './src/routes/*.ts' : './dist/routes/*.js'],
});

const swaggerHtml = swaggerUi.generateHTML(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Water Quality API Docs',
});

router.use('/', swaggerUi.serve);
router.get('/', (_req: Request, res: Response) => {
  const nonce = res.locals.nonce as string;
  const html = swaggerHtml.replace(/<script /g, `<script nonce="${nonce}" `);
  res.send(html);
});

router.get('/openapi.json', (_req, res) => {
  res.json(specs);
});

export default router;
