const express = require('express')
const {getVishes, createVishTimeStamp, createVish, vishVish, setVishSuccess, updateVish, deleteVish, getMyVishes}= require('../controllers/vishs')

const router = express.Router()
const { protect } = require('../middleware/user');

router.route('/getvishes').get(getVishes)
router.route('/getmyvish').get(protect, getMyVishes)
router.route('/createvish').post(protect, createVish)
router.route('/vishVish').post(protect, vishVish)
router.route('/setvishsuccess').put(protect, setVishSuccess)
router.route('/updatevish').put(protect, updateVish)
router.route('/deletevish').delete(protect, deleteVish)

module.exports = router
