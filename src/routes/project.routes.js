import { Router } from "express";
import * as projectCtrl from "../controllers/project.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireVerified } from "../middleware/verified.middleware.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  createProjectSchema,
  updateProjectSchema,
  projectListQuerySchema,
} from "../validators/project.validator.js";

const router = Router();

/**
 * @openapi
 * /api/project:
 *   post:
 *     tags: [Project]
 *     summary: Create a project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectCreate'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   $ref: '#/components/schemas/Project'
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
router.post(
  "/",
  authMiddleware,
  requireVerified,
  validate(createProjectSchema),
  projectCtrl.createProject
);

/**
 * @openapi
 * /api/project:
 *   get:
 *     tags: [Project]
 *     summary: List projects (paginated)
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
 *         name: client
 *         description: Filter by client ObjectId
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *       - in: query
 *         name: name
 *         description: Partial case-insensitive match on project name
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         description: "true or false string"
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-createdAt" }
 *     responses:
 *       200:
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProjects'
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
  validateQuery(projectListQuerySchema),
  projectCtrl.listProjects
);

/**
 * @openapi
 * /api/project/archived:
 *   get:
 *     tags: [Project]
 *     summary: List archived projects
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
 *         name: client
 *         schema:
 *           $ref: '#/components/schemas/ObjectId'
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated archived projects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProjects'
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
  validateQuery(projectListQuerySchema),
  projectCtrl.listArchivedProjects
);

/**
 * @openapi
 * /api/project/{id}:
 *   get:
 *     tags: [Project]
 *     summary: Get project by id
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
 *                 project:
 *                   $ref: '#/components/schemas/Project'
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
  projectCtrl.getProjectById
);

/**
 * @openapi
 * /api/project/{id}:
 *   put:
 *     tags: [Project]
 *     summary: Update project
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
 *             $ref: '#/components/schemas/ProjectUpdate'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   $ref: '#/components/schemas/Project'
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
  validate(updateProjectSchema),
  projectCtrl.updateProject
);

/**
 * @openapi
 * /api/project/{id}:
 *   delete:
 *     tags: [Project]
 *     summary: Delete project
 *     description: Query soft=true archives the project.
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
  projectCtrl.deleteProject
);

/**
 * @openapi
 * /api/project/{id}/restore:
 *   patch:
 *     tags: [Project]
 *     summary: Restore archived project
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
 *                 project:
 *                   $ref: '#/components/schemas/Project'
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
  projectCtrl.restoreProject
);

export default router;
