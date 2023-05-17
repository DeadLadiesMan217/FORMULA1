const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false,
        required: true
    },
    cart: {
        items: [{
            eventId: {
                type: Schema.Types.ObjectId,
                ref: 'Event',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            _id: false
        }]
    }
}, {
    timestamps: true, 
    versionKey: false
});

userSchema.methods.addToCart = function (product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.eventId.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];

    if (this.cart.items.length !== 0 && cartProductIndex < 0) {
        const error = new Error(`Could't add different events in the cart at the same time. Please proceed with payment or clear you cart first.`);
        error.statusCode = 422;
        throw error;
    }

    if (cartProductIndex >= 0) {
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
        updatedCartItems.push({
            eventId: product._id,
            quantity: newQuantity
        });
    }

    const updatedCart = {
        items: updatedCartItems
    };
    this.cart = updatedCart;
    return this.save();
};

userSchema.methods.removeFromCart = function (productId) {
    const updatedCartItems = this.cart.items.filter(item => {
        return item.eventId.toString() !== productId.toString();
    });

    console.log(updatedCartItems);

    this.cart.items = updatedCartItems;
    return this.save();
};

userSchema.methods.clearCart = function () {
    this.cart = { items: [] }
    this.save();
};

module.exports = mongoose.model('User', userSchema);