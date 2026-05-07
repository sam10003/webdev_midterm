import { Router } from "express";
import * as dnCtrl from "../controllers/deliverynote.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/verified.middleware.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  createDeliveryNoteSchema,
  signDeliveryNoteSchema,
  deliveryNoteListQuerySchema,
} from "../validators/deliverynote.validator.js";

const router = Router();

/**
 * @openapi
 * /api/deliverynote:
 *   post:
 *     tags: [DeliveryNote]
 *     summary: Create delivery note
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryNoteCreate'
 *     responses:
 *       201:
 *         description: Created (unsigned)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveryNote:
 *                   $ref: '#/components/schemas/DeliveryNote'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
router.post(
  "/",
  authMiddleware,
  requireVerified,
  validate(createDeliveryNoteSchema),
  dnCtrl.createDeliveryNote
);

/**
 * @openapi
 * /api/deliverynote:
 *   get:
 *     tags: [DeliveryNote]
 *     summary: List delivery notes
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
 *         name: project
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *       - in: query
 *         name: client
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [material, hours]
 *       - in: query
 *         name: signed
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: from
 *         description: Filter workDate greater or equal (ISO date)
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         description: Filter workDate less or equal (ISO date)
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-workDate" }
 *     responses:
 *       200:
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedDeliveryNotes'
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
  validateQuery(deliveryNoteListQuerySchema),
  dnCtrl.listDeliveryNotes
);

/**
 * PDF download — MUST be registered before `/:id` so `pdf` is not captured as id.
 * @openapi
 * /api/deliverynote/pdf/{id}:
 *   get:
 *     tags: [DeliveryNote]
 *     summary: Download delivery note PDF
 *     description: Allowed if same company and you are the creator or your role is guest.
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
 *         description: PDF binary stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
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
  "/pdf/:id",
  authMiddleware,
  requireVerified,
  dnCtrl.downloadDeliveryNotePdf
);

/**
 * @openapi
 * /api/deliverynote/{id}:
 *   get:
 *     tags: [DeliveryNote]
 *     summary: Get delivery note (populated user, company, client, project)
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
 *                 deliveryNote:
 *                   $ref: '#/components/schemas/DeliveryNote'
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
  dnCtrl.getDeliveryNoteById
);

/**
 * @openapi
 * /api/deliverynote/{id}/sign:
 *   patch:
 *     tags: [DeliveryNote]
 *     summary: Sign delivery note and generate PDF
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
 *             $ref: '#/components/schemas/SignDeliveryNoteRequest'
 *     responses:
 *       200:
 *         description: Signed; PDF path returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deliveryNote:
 *                   $ref: '#/components/schemas/DeliveryNote'
 *                 pdfPath:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
  "/:id/sign",
  authMiddleware,
  requireVerified,
  validate(signDeliveryNoteSchema),
  dnCtrl.signDeliveryNote
);

/**
 * @openapi
 * /api/deliverynote/{id}:
 *   delete:
 *     tags: [DeliveryNote]
 *     summary: Soft-delete unsigned delivery note
 *     description: Fails with 400 if already signed. Removes generated PDF file if present.
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
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
  dnCtrl.deleteDeliveryNote
);

export default router;
