const User = require("../models/User");

exports.updateUser = async (userData) => {
    try {
        const user = await User.findByIdAndUpdate(
            userData._id,
            userData.data,
            {
                new: true,
                runValidators: true,
                session : userData.session ?? undefined
            }
        );

        if (!user) {
            const error = new Error(`Failed to update user with ID ${this.user_id}`);
            error.statusCode = 400; 
            throw error 
        }

        return user
    }
    catch (err) {
        const error = new Error(`Failed to update user with ID ${this.user_id}`);
        error.statusCode = 400; 
        throw error
    }
};