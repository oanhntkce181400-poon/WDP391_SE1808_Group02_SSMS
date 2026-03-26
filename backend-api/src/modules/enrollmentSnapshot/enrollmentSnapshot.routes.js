const { Router } = require("express");
const authMiddleware = require("../../middlewares/auth.middleware");
const rbacMiddleware = require("../../middlewares/rbac.middleware");
const controller = require("./enrollmentSnapshot.controller");

const router = Router();

router.get(
  "/",
  authMiddleware,
  rbacMiddleware(["admin", "staff"]),
  controller.list,
);
router.get(
  "/:id/class-sections",
  authMiddleware,
  rbacMiddleware(["admin", "staff", "lecturer"]),
  controller.getClassSections,
);
router.get(
  "/:id/roster",
  authMiddleware,
  rbacMiddleware(["admin", "staff", "lecturer"]),
  controller.getRoster,
);
router.get(
  "/:id",
  authMiddleware,
  rbacMiddleware(["admin", "staff"]),
  controller.getById,
);
router.post(
  "/",
  authMiddleware,
  rbacMiddleware(["admin", "staff"]),
  controller.create,
);
router.put(
  "/:id",
  authMiddleware,
  rbacMiddleware(["admin", "staff"]),
  controller.update,
);
router.delete(
  "/:id",
  authMiddleware,
  rbacMiddleware(["admin", "staff"]),
  controller.remove,
);

module.exports = router;
