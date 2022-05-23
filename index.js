const express = require('express');
const app=express()
const port=process.env.PORT || 5000
const cors=require("cors")
app.use(cors())
app.use(express.json())


app.get("/",(req,res)=>{
    res.send("Picker server Running Well")

})
app.listen(port,()=>{
    console.log("Also well");
})