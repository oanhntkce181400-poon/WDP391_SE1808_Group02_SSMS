const express = require("express");
const router = express.Router();
const ctrl = require("./semester.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const rbacMiddleware = require("../../middlewares/rbac.middleware");

// All routes require authentication
router.use(authMiddleware);

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getById);
router.post("/", rbacMiddleware(["admin", "staff"]), ctrl.create);
router.put("/:id", rbacMiddleware(["admin", "staff"]), ctrl.update);
router.delete("/:id", rbacMiddleware(["admin", "staff"]), ctrl.remove);

module.exports = router;
