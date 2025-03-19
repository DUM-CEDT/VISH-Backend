const Vish = require('../models/Vish')
const mongoose = require('mongoose')
const VishTimeStamp = require ('../models/VishTimeStamp')
const User = require('../models/User')
const { updateUser } = require('../utils/updateUser')
const Transaction = require('../models/Transaction')
const rewardUtil = require('../utils/rewardUtils')
const VishCategory = require('../models/Category')
const Category = require('../models/Category')


//@desc         Any thing about Vish

//@desc         Get All Vish With Pagination
//@route        GET /api/vish/getallvish/:page
//@access       Public
exports.getVishes = async (req , res, next) => {

    const pageSize = 24
    let query 

    let reqQuery = { ...req.query }
    const removeFields = ['page', 'type']

    removeFields.forEach((param) => delete reqQuery[param])

    let vishes

    const type = req.query.type
    let page = req.query.page

    if (!page)
        page = 0
    else
        page = parseInt(page)

    if (!type || type == 'latest') {
        vishes = await Vish.find().sort({create_at : -1}).limit(pageSize).skip(page * pageSize)
    }
    else if (type == 'popular') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        vishes = await VishTimeStamp.aggregate(
            [
                {
                  '$match': {
                    'timestamp': {
                      '$gte': sevenDaysAgo
                    }
                  }
                }, {
                  '$group': {
                    '_id': '$vish_id', 
                    'count': {
                      '$sum': 1
                    }
                  }
                }, {
                  '$sort': {
                    'count': -1
                  }
                }, {
                  '$lookup': {
                    'from': 'vishes', 
                    'localField': '_id', 
                    'foreignField': '_id', 
                    'as': 'vish_data'
                  }
                }, {
                  '$unwind': {
                    'path': '$vish_data', 
                    'preserveNullAndEmptyArrays': false
                  }
                }, {
                  '$replaceRoot': {
                    'newRoot': '$vish_data'
                  }
                }, {
                  '$skip': page * pageSize
                }, {
                  '$limit': pageSize
                }
              ]
          )
        
    }
    
    return res.status(200).json({
        success : true,
        count : vishes.length,
        pagination : {
            page : page,
            next : page + 1,
            prev : page - 1
        },
        vishes : vishes
    })
}

//@desc         Get All Vish That This User Created With Pagination
//@route        GET /api/vish/getmyvish/:page
//@access       Private
exports.getMyVishes = async (req , res , next) => {

    const pageSize = 24
    let page = req.query.page

    if (!page)
        page = 0
    else
        page = parseInt(page)
    
    let vishes = await Vish.find({user_id : req.user._id }).sort({create_at : -1}).limit(pageSize).skip(page * pageSize)
    
    return res.status(200).json({
        success : true,
        count : vishes.length,
        pagination : {
            page : page,
            next : page + 1,
            prev : page - 1
        },
        vishes : vishes
    })


}

//@desc         Create New Vish
//@route        POST /api/vish/createVish/
//@access       Private
exports.createVish = async (req , res , next) => {

    const userId = req.user._id
    const {text, category_list, is_bon, bon_condition, bon_vish_target, bon_credit, distribution } = req.body
    const mongoose_session = await mongoose.startSession()
    let thisUser = req.user
    let total_credit
    mongoose_session.startTransaction()
    
    if (!thisUser) {
        mongoose_session.endSession()
        return res.status(404).json({
            success : false,
            msg : `No user with id : ${userId}`
        })
    }

    try {

        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24); 
        
        const createdVishInOneDay = await Vish.countDocuments({user_id : userId, create_at : {$gte : oneDayAgo}})
        if ((thisUser.premium && createdVishInOneDay >= 3) || (!thisUser.premium && createdVishInOneDay >= 1)) {
            mongoose_session.endSession()
            return res.status(400).json({
                success : false,
                msg : "Reach Day Vish Create Limit"
            })
        }

        if (is_bon) {

            if (bon_condition == true && distribution > bon_vish_target) {
                return res.status(400).json({
                    success : false,
                    msg : "Distribution can't greater than Vish Target"
                })
            }

            total_credit = (bon_credit *distribution)

            if (thisUser.credit < total_credit) {
                return res.status(400).json({
                    success : false,
                    msg : "User credit is less than the credit of bon condition"
                })
            }
            
            thisUser = await updateUser({
                _id : userId,
                data : {
                    credit : thisUser.credit - total_credit
                },
                session : mongoose_session
            })
            
        }

        newVish = await Vish.insertOne({
            user_id : userId,
            text,
            category_list,
            is_bon,
            bon_condition,
            bon_vish_target : (is_bon == true && bon_condition == true) ? bon_vish_target : 0,
            bon_credit : is_bon == false ? 0 : bon_credit,
            distribution : is_bon == false ? 1 : distribution,
        }, {session : mongoose_session})

        let vishCreateDate = newVish.create_at

        if (is_bon) {
            createdTransaction = await Transaction.insertOne({
                 user_id: userId, 
                 amount: total_credit, 
                 trans_category: 'bon',
                 created_at : vishCreateDate
            }, {session : mongoose_session})

            let newTimeStamp = new VishTimeStamp({
                vish_id : newVish._id,
                user_id : userId,
                status : false,
                point : 10,
                timestamp : vishCreateDate
            })

            newTimeStamp.$session(mongoose_session)
            newTimeStamp = await newTimeStamp.save()
            
        }

        await mongoose_session.commitTransaction()
    }
    catch (err) {
        await mongoose_session.abortTransaction();
        mongoose_session.endSession()
        return res.status(400).json({
            success : false, msg : err.message
        })
    }
    mongoose_session.endSession()

    res.status(200).json({success : true, vish : newVish})
}

//@desc         Vish (Like) Vish
//@route        POST /api/vish/vishvish/
//@access       Private
exports.vishVish = async (req , res , next) => {
    
    const vishId = req.body.vish_id
    const userId = req.user._id
    const mongoose_session = await mongoose.startSession()
    let startReward = false

    try {

        const isThisUserAlreadyVish = await VishTimeStamp.exists(
            {   
                vish_id : vishId, 
                user_id : userId,
                status : true,
                point : 1
        });

        mongoose_session.startTransaction()

        let cnt = 0
        if (isThisUserAlreadyVish) {
            
            cnt = -1

            const removeVishTimeStamp = await VishTimeStamp.findOneAndDelete({
                vish_id : vishId,
                user_id : userId,
                status : true,
                point : 1
            }, {new : true,session : mongoose_session})

        }
        else { // Not Already Like

            cnt = 1

            const insertVishTimeStamp = await VishTimeStamp.insertOne({
                vish_id : vishId,
                user_id : userId,
                status : true,
                point : 1,
            }, {new : true, session : mongoose_session})

        }

        var updateVish = await Vish.findByIdAndUpdate(vishId, {$inc : {vish_count : cnt}}, {new : true, session : mongoose_session})
        await mongoose_session.commitTransaction()
        mongoose_session.endSession()

        startReward = true
        console.log(99999)

        if (updateVish.is_bon == true && updateVish.bon_condition == true && updateVish.vish_count >= updateVish.bon_vish_target && updateVish.is_success == false) {
                console.log("In If")
                const rewardDistribution = await rewardUtil(vishId, userId)
                if (rewardDistribution.success == true) {
                    console.log("Before Update")
                    updateVish.is_success = true
                }
        }
        console.log(12345)
        return res.status(200).json({
            success : true,
            vish : updateVish
        })  

    }
    catch(err) {
        if (!startReward) {
            await mongoose_session.abortTransaction();
            mongoose_session.endSession()
        }
        console.log(err)
        return res.status(400).json({
            success : false,
            msg : err.message
        })
    }


}

//@desc         Set Vish Status To Success (For Bon condition false)
//@route        POST /api/vish/vishvish/
//@access       Private
exports.setVishSuccess = async (req , res , next) => {
    
    const userId = req.user._id
    const vishId = req.body.vish_id

    const mongoose_session = await mongoose.startSession()
    mongoose_session.startTransaction()
    try {

        targetVish = await Vish.findById(vishId).session(mongoose_session)        

        if (targetVish.is_bon == false) {
            return res.status(400).json({
                success : false,
                msg : "This Vish has no bon"
            })
        }

        if (targetVish.bon_condition == true) {
            return res.status(400).json({
                success : false,
                msg : "This Vish can't use this success function (Bon Type = true)"
            })
        }

        if (targetVish.user_id.toString() != userId.toString()) {
            return res.status(400).json({
                success : false,
                msg : `User with ID : ${userId} is not the owner of Vish with ID : ${vishId}`
            })
        }
        
        if (targetVish.is_success) {
            return res.status(400).json({
                success : false,
                msg : `This Vish is already set to success status`
            })
        }

        targetVish.is_success = true
        
        await mongoose_session.commitTransaction()
        mongoose_session.endSession()
        
        const rewardDistriburtion = await rewardUtil(vishId, userId, mongoose_session)

        if (rewardDistriburtion.success == false) {
            return res.status(400).json({
                success : false,
                msg : rewardDistriburtion.msg
            })
        }

        return res.status(200).json({
            success : true,
            vish : targetVish
        })
        

    }
    catch (err) {

        await mongoose_session.abortTransaction()
        mongoose_session.endSession()
        return res.status(400).json({
            success : false,
            msg : err.message
        })
    }


}

exports.updateVish = async (req, res, next) => {

    let vishId = req.body.vish_id
    let userId = req.user._id
    let text = req.body.text
    let category_list = req.body.category_list

    let targetVish = Vish.findById(vishId)

    if (!targetVish) {
        return res.status(404).json({
            success : false,
            msg : `Can't find Vish with ID : ${vishId}`
        })
    }

    if (targetVish.user_id.toString() != userId.toString()) {
        return res.status(400).json({
            success : false,
            msg : `User with ID : ${userId} is not the owner of Vish with ID : ${vishId}`
        })
    }

    if (!text || text.length == 0) {
        return res.status(400).json({
            success : false,
            msg : "Please provide un blank text"
        })
    }

    try {
        targetVish.text = text
        targetVish.category_list = category_list

        targetVish = await targetVish.save()

        return res.status(200).json({
            success : true,
            vish : targetVish
        })
    }
    catch (err) {
        return res.status(400).json({
            success : false,
            msg : err.message
        })
    }

}

exports.deleteVish = async (req, res, next) => {
    // transaction "bon-delete"
    // refund credit
    // remove like from vishtimestamp
    const vishId = req.body.vish_id
    const userId = req.user._id
    
    let targetVish = await Vish.findById(vishId)
    
    if (!targetVish) {
        return res.status(404).json({
            success : false,
            msg : `Can't find Vish with ID : ${vishId}`
        })
    }

    if (targetVish.user_id.toString() != userId.toString()) {
        return res.status(400).json({
            success : false,
            msg : `User with ID : ${userId} is not the owner if Vish with ID : ${vishId}`
        })
    }
    
    const mongoose_session = await mongoose.startSession()
    mongoose_session.startTransaction()
    
    try {
        
        if (targetVish.is_bon == true) {
            deleteBonPoint = await VishTimeStamp.findOneAndDelete({
                vish_id : targetVish._id,
                status : false,
                point : 10
            }, {session : mongoose_session})
            
            const total_credit = targetVish.distribution * targetVish.bon_credit
            
            const giveOwnerCreditBack = await User.findByIdAndUpdate(targetVish.user_id, {$inc : {credit : total_credit}}, {session : mongoose_session})
            
            const insertDeleteTransaction = await Transaction.insertOne({
                user_id : targetVish.user_id,
                amount : total_credit,
                trans_category : 'delete-bon'
            }, {session : mongoose_session})
            
        }
        
        const removeAllVishFromThisVish = await VishTimeStamp.deleteMany({
            vish_id : targetVish._id
        }, {session : mongoose_session})
        
        const deleteVish = await Vish.findByIdAndDelete(vishId, {session : mongoose_session})
        
        await mongoose_session.commitTransaction()
        await mongoose_session.endSession()

        return res.status(200).json({
            success : true,
            vish : deleteVish
        })
        
    }
    catch(err) {
        return res.status(400).json({
            success : false,
            msg : err.message
        })
    }


}


// @desc      Get all Vish categories
// @route     GET /api/vish/categories
// @access    Public
exports.getVishCategories = async (req, res, next) => {
    try {
        const categories = await VishCategory.find({}, {
            _id: 1, 
            category_name: 1,
            color: 1
        })

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories: categories
        })
    } catch (err) {
        return res.status(400).json({
            success: false,
            msg: err.message
        })
    }
}

//@desc         Get Single Category By ID
//@route        GET /api/vish/category/:id
//@access       Public
exports.getCategoryById = async (req, res, next) => {
    try {
        const categoryId = req.params.id

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                msg: "Invalid category ID"
            })
        }

        const category = await Category.findById(categoryId)

        if (!category) {
            return res.status(404).json({
                success: false,
                msg: `Category with ID ${categoryId} not found`
            })
        }

        return res.status(200).json({
            success: true,
            category: {
                _id: category._id,
                category_name: category.category_name,
                color: category.color
            }
        })
    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: err.message
        })
    }
}

//@desc     Get liked vishes for a user
//@route    GET /api/vish/vishstatus
//@access   Private
exports.getVishStatus = async (req, res, next) => {
    try {
      const userId = req.user._id;
  
      // ดึงข้อมูลจาก VishTimeStamp ที่ user นี้กดไลค์
      const likedVishes = await VishTimeStamp.find(
        {
          user_id: userId,
          status: true,
          point: 1,
        },
        { vish_id: 1, _id: 0 } // ดึงเฉพาะ vish_id
      );
  
      // แปลงผลลัพธ์ให้เป็น array ของ vish_id
      const vishIds = likedVishes.map((vish) => vish.vish_id.toString());
  
      return res.status(200).json({
        success: true,
        likedVishes: vishIds, // ส่ง array ของ vish_id ที่ user นี้กดไลค์
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        success: false,
        msg: err.message,
      });
    }
  };
