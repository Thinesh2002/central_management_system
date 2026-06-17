const express = require('express');
const router = express.Router();
const controller = require('../controllers/user_controllers/user_controller');
const authMiddleware = require('../middleware/auth_middleware');


router.post('/register',authMiddleware, controller.register);
router.post('/login', controller.login);

router.get('/users',authMiddleware, controller.listUsers);   
router.get('/stats',authMiddleware, controller.stats);       


router.get('/:id',authMiddleware, controller.getUser);
router.put('/:id',authMiddleware, controller.update);      
router.delete('/:id',authMiddleware, controller.delete);   


router.get('/me', authMiddleware, controller.me);


module.exports = router;
