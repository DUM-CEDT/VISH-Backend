const User = require('../models/User');
const YanTemplate = require('../models/YanTemplate');

//@desc     Register user
//@route    POST /api/users/register
//@access   Public
exports.register = async (req, res, next) => {
    try {
        console.log(req.body)
        const { name, email, password, role } = req.body;
        const user = await User.create({
            name,
            email,
            password,
            role
        });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({ success: false , msg : "Email or user ID already exists"});

    }
};

//@desc     Login user
//@route    POST /api/users/login
//@access   Public
exports.login = async (req, res, next) => {
    try {
        //Validate email & password
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, msg: 'Please provide an email and password' });
        }

        //Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, msg: 'Invalid credentials' });
        }

        //Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, msg: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    }
    catch (err) {
        res.status(400).json({ success: false, msg: 'Cannot convert email or password to string' });
    }
};

//@desc     Update user
//@route    PUT /api/users/edit/:id
//@access   Private
exports.update = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false,
                msg: `Cannot find user with id ${req.params.id}`
            });
        }

        res.status(200).json({ success: true, data: user });
    }
    catch (err) {
        res.status(400).json({ success: false, msg: 'Failed to update user' });
    }
};

//@desc     Log user out / clear cookie
//@route    GET /api/users/logout
//@access   Private
exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ success: true, msg: 'Logged out successfully' });
};

//@desc     Get current logged in user
//@route    GET /api/users/me
//@access   Private
exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ 
        success: true, 
        data: user 
    });
};

//@desc     Add yan template to user's yan_template_id array
//@route    POST /api/user/add-yan-template/:yanTemplateId
//@access   Private
exports.addYanTemplate = async (req, res, next) => {
    try {
        const yanTemplateId = req.params.yanTemplateId;
        const userId = req.user.id;

        const yanTemplate = await YanTemplate.findById(yanTemplateId);
        if (!yanTemplate) {
            return res.status(404).json({
                success: false,
                msg: `Yan template with id ${yanTemplateId} not found`
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: `User with id ${userId} not found`
            });
        }

        if (user.yan_template_id.includes(yanTemplateId)) {
            return res.status(200).json({
                success: false,
                msg: `Yan template with id ${yanTemplateId} already exists in user's template list`
            });
        }

        user.yan_template_id.push(yanTemplateId);
        await user.save();

        res.status(200).json({
            success: true,
            data: {
                yan_template_id: user.yan_template_id
            },
            msg: 'Yan template added successfully'
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            msg: 'Failed to add yan template',
            error: err.message
        });
    }
};

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    //Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000), //process.env.JWT_COOKIE_EXPIRE * 60 * 1000 คือถ้านับเป็นนาที
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode).cookie('token', token, options).json({ 
        success: true, 
        token 
    });
};