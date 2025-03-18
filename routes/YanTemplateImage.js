const express = require('express');
const { createYanImage , updateYanImage , getYanImages , getYanImage , deleteYanImage } = require('../controllers/YanTemplateImage');
const { authorize , protect } = require('../middleware/user');
const router = express.Router();

router.route('/').post(protect,authorize("admin"), createYanImage);
router.route('/:id').put(protect, authorize("admin"), updateYanImage);
router.route('/').get( getYanImages);
router.route('/:id').get( getYanImage);
router.route('/:id').delete(protect,authorize("admin"), deleteYanImage);

module.exports = router;