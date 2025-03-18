const express = require('express');
const router = express.Router();

const {
  getAllMerch,
  getOneMerch,
  addMerch,
  updateMerch,
  deleteMerch
} = require('../controllers/Merchandise');

const {
  getAllMerchTrans,
  getOneMerchTrans,
  addMerchTrans,
  updateMerchTrans,
  deleteMerchTrans
} = require('../controllers/MerchandiseTransaction');

const { protect, authorize } = require('../middleware/user'); // เปลี่ยนจาก auth เป็น user

router.get('/items', getAllMerch);
router.get('/items/:id', getOneMerch);
router.post('/items', protect, authorize('admin'), addMerch); // ต้องการ Admin
router.put('/items/:id', protect, authorize('admin'), updateMerch); // ต้องการ Admin
router.delete('/items/:id', protect, authorize('admin'), deleteMerch); // ต้องการ Admin

router.get('/transactions', protect, getAllMerchTrans);
router.get('/transactions/:id', protect, getOneMerchTrans);
router.post('/transactions', protect, addMerchTrans);
router.put('/transactions/:id', protect, authorize('admin'), updateMerchTrans); // ต้องการ Admin
router.delete('/transactions/:id', protect, authorize('admin'), deleteMerchTrans); // ต้องการ Admin

module.exports = router;