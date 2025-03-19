const express = require('express');
const { createYanTemplate , getYanTemplates , getYanTemplate , deleteYanTemplate, downloadYanTemplate, calculateYanLayers, getMyYanTemplatesWithImages, downloadYanTemplateWithoutSession} = require('../controllers/YanTemplate');
const { authorize , protect } = require('../middleware/user');
const router = express.Router();

router.route('/').post( createYanTemplate);
router.route('/').get( getYanTemplates);
router.route('/getMyYan').get(protect,getMyYanTemplatesWithImages);
router.route('/:id').get( getYanTemplate);
router.route('/:id').delete(protect,authorize("admin"), deleteYanTemplate);
router.route('/download/:id').get(protect, downloadYanTemplate);
router.route('/download_nosession/:id').get(downloadYanTemplateWithoutSession);
router.post('/calculate-yan-layers', calculateYanLayers);


module.exports = router;