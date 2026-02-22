const { Router } = require("express");
const ctrl = require("./lecturer.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const rbacMiddleware = require("../../middlewares/rbac.middleware");
const avatarUpload = require("../../middlewares/avatarUpload.middleware");

const router = Router();
const ADMIN_STAFF = rbacMiddleware(["admin", "staff"]);

router.use(authMiddleware);

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getById);
router.post("/", ADMIN_STAFF, avatarUpload.single("avatar"), ctrl.create);
router.put("/:id", ADMIN_STAFF, avatarUpload.single("avatar"), ctrl.update);
router.delete("/:id", ADMIN_STAFF, ctrl.remove);

module.exports = router;
