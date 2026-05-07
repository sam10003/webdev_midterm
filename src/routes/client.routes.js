import { Router } from "express";
import * as clientCtrl from "../controllers/client.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/verified.middleware.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  createClientSchema,
  updateClientSchema,
  clientListQuerySchema,
} from "../validators/client.validator.js";

const router = Router();

/**
 * @openapi
 * /api/client:
 *   post:
 *     tags: [Client]
 *     summary: Create a client
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientCreate'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post(
  "/",
  authMiddleware,
  requireVerified,
  validate(createClientSchema),
  clientCtrl.createClient
);

/**
 * @openapi
 * /api/client:
 *   get:
 *     tags: [Client]
 *     summary: List clients (paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: name
 *         description: Partial case-insensitive match on client name
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         description: Field name; prefix with - for descending (createdAt, name, updatedAt)
 *         schema:
 *           type: string
 *           example: "-createdAt"
 *     responses:
 *       200:
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedClients'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get(
  "/",
  authMiddleware,
  requireVerified,
  validateQuery(clientListQuerySchema),
  clientCtrl.listClients
);

/**
 * @openapi
 * /api/client/archived:
 *   get:
 *     tags: [Client]
 *     summary: List archived (soft-deleted) clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated archived clients
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedClients'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get(
  "/archived",
  authMiddleware,
  requireVerified,
  validateQuery(clientListQuerySchema),
  clientCtrl.listArchivedClients
);

/**
 * @openapi
 * /api/client/{id}:
 *   get:
 *     tags: [Client]
 *     summary: Get client by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get(
  "/:id",
  authMiddleware,
  requireVerified,
  clientCtrl.getClientById
);

/**
 * @openapi
 * /api/client/{id}:
 *   put:
 *     tags: [Client]
 *     summary: Update client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientUpdate'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put(
  "/:id",
  authMiddleware,
  requireVerified,
  validate(updateClientSchema),
  clientCtrl.updateClient
);

/**
 * @openapi
 * /api/client/{id}:
 *   delete:
 *     tags: [Client]
 *     summary: Delete client
 *     description: Pass query soft=true to archive (soft delete) instead of hard delete.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *       - in: query
 *         name: soft
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Deleted or archived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete(
  "/:id",
  authMiddleware,
  requireVerified,
  clientCtrl.deleteClient
);

/**
 * @openapi
 * /api/client/{id}/restore:
 *   patch:
 *     tags: [Client]
 *     summary: Restore archived client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *     responses:
 *       200:
 *         description: Restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.patch(
  "/:id/restore",
  authMiddleware,
  requireVerified,
  clientCtrl.restoreClient
);

export default router;
