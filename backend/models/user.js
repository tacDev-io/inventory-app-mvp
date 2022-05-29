const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  userProfile: {
    role: { type: Number, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    themePref: { type: String, required: true, default: "theme-dark" }
  }
});

userSchema.methods.ownerAddBusiness = function (newBusiness) {
  console.log("||| newBusiness |||");
  console.log(newBusiness);

  this.userProfile.business = newBusiness._id;

  console.log("||| this |||");
  console.log(this);
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
