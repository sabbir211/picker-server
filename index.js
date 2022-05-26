const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const app = express()
const port = process.env.PORT || 5000
const cors = require("cors")
const dotenv = require("dotenv").config()
const jwt = require('jsonwebtoken');
app.use(cors())
app.use(express.json())
const stripe = require("stripe")(process.env.STRIPE_KEY)
app.get("/", (req, res) => {
    res.send("Picker server Running Well")

})
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized" })
    }
    const token = authHeader.split(" ")[1]

    jwt.verify(token, process.env.PRIVATE_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden" })
        }
        req.decoded = decoded;
        next()
    })
}
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.izp32.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect()
        const toolsCollection = client.db("tools").collection("tools")
        const usersCollection = client.db("users").collection("users")
        const ordersCollection = client.db("orders").collection("orders")

        app.get("/tools", async (req, res) => {
            const result = await toolsCollection.find().toArray()
            res.send(result)
        })
        // making user 
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const option = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, option)
            
            const token = jwt.sign({ email: email }, process.env.PRIVATE_KEY, { expiresIn: "1d" })
            res.send({ token ,result})
        })
        app.get("/user/:email", async (req, res) => {
            const email=req.params.email
            const query={email:email}
            const result = await usersCollection.findOne(query)
            res.send(result)
        })
        // get single items by id 
        app.get("/purchase/:id", async (req, res) => {
            const id = req.params.id

            const query = { _id: ObjectId(id) }
            const result = await toolsCollection.findOne(query)
            res.send(result)
        })
        // store order 
        app.post("/purchase", async (req, res) => {
            const doc = req.body
            const result = await ordersCollection.insertOne(doc)
            res.send(result)
        })
        // get  orders by user 
        app.get("/orders", verifyJWT, async (req, res) => {
            const email = req.query.email
            const filter = { email: email }
            const result = await ordersCollection.find(filter).toArray()
            res.send(result)
        })
        // delete order from db 
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        })
        app.get("/payment/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.findOne(query)
            res.send(result)
        })
        //  make admin 
        app.put("/user/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email
            const requester = req.decoded.email
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === "admin") {
                const filter = { email: email }
                const updateDoc = {
                    $set: {
                        role: "admin"
                    }
                }
                const result = await usersCollection.updateOne(filter, updateDoc)
                res.send(result)
            }
            else {
                res.status(403).send({ message: "forbidden" })
            }

        })
        // get users list 
        app.get("/users", verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        // get user for check role 
        app.get("/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin'
            res.send({ admin: isAdmin })
        })


        // PAYMENT IS HERE 
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.totalAmount
            const amount = price * 100
            console.log(amount);
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        app.put("/orderConfirmed/:id", verifyJWT, async (req, res) => {
            const id = req.params.id
            filter = { _id: ObjectId(id) }
            const transactionId = req.body.transactionId
            const option = { upsert: true }
            const doc = {
                $set: {
                    status: "paid",
                    transactionId: transactionId
                }
            }
            const result = await ordersCollection.updateOne(filter, doc, option)
            res.send(result)
        })

    }
    finally {

    }
}
run().catch(console.dir)


app.listen(port, () => {
    console.log("Also well");
})