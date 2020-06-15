const mongoose = require('mongoose');

// Connecting to database:
mongoose.connect("mongodb://localhost:27017/artAuctionDB", 
    {useUnifiedTopology: true, useNewUrlParser: true});

//note: _id is auto created
const personSchema = new mongoose.Schema ({
    pid: Number,
    firstName: String,
    lastName: String,
    role: String //seller or buyer
});

// people collection
const Person = mongoose.model("Person", personSchema);

const seller2 = new Person ({
    pid: 109577350773763,
    firstName: "Jenn",
    lastName: "Lau",
    role: "seller"
})

// read from db:
Person.find((err, people) => {
    if (err) {
        console.log(err);
    } else {
        console.log(people);
    }
    // close db connection after last action to be performed:
    mongoose.connection.close();
});
// seller2.save();

const artworkSchema = new mongoose.Schema ({
    pid: Number, //pid of seller
    category: String, // Painting, Mixed Media, or Sculpture
    title: String,
    imageURL: String,
    yearCreated: Number,
    height: Number, //in inches
    width: Number, //in inches
    price: Number //in CAD
});

const Artwork = mongoose.model("Artwork", artworkSchema);

