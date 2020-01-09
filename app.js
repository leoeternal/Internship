var express=require("express")
var mongoose=require("mongoose")
var bodyParser=require("body-parser")
var passport=require("passport")
var localStrategy=require("passport-local");
var passportLocalMongoose=require("passport-local-mongoose");

var app=express()

app.use(express.static("./public/js"));

var questionSchema=new mongoose.Schema({
    user:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:{
            type:String
        }
    },
    question:String,
    name:String,
    date:{
        type:Date,
        default:Date.now
    },
    answers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Answer"
    }],
    answerqueries:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"AnswerQuery"
    }],
    questionqueries:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"QuestionQuery"
    }]
});

var Question=mongoose.model("Question",questionSchema);


var questionquerySchema=new mongoose.Schema({
    user:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:{
            type:String
        }
    },
    questionquery:String,
    name:String,
    date:{
        type:Date,
        default:Date.now
    }
});

var QuestionQuery=mongoose.model("QuestionQuery",questionquerySchema);


var answerSchema=new mongoose.Schema({
    user:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:{
            type:String
        }
    },
    answer:{
        type:String
    },
    date:{
        type:Date,
        default:Date.now
    }
});
var Answer=mongoose.model("Answer",answerSchema);

var answerquerySchema=new mongoose.Schema({
    user:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:{
            type:String
        }
    },
    answerquery:{
        type:String
    },
    date:{
        type:Date,
        default:Date.now
    }
});
var AnswerQuery=mongoose.model("AnswerQuery",answerquerySchema);

var userSchema=new mongoose.Schema({
    username:String,
    password:String
});
userSchema.plugin(passportLocalMongoose);
var User=mongoose.model("User",userSchema);

mongoose.connect("mongodb://localhost/internship");
app.use(bodyParser.urlencoded({extended:true}));
app.use(require("express-session")({
    secret:"Messi is the best",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",isLoggedOut,function(req,res){
    res.render("home.ejs")
})

app.get("/register",function(req,res){
    res.render("register.ejs");
})

app.post("/register",function(req,res){
    var username=req.body.username;
    var password=req.body.password;
    User.register(new User({username:username}),req.body.password,function(err,userregistered){
        if(err){
            return res.redirect("/register")
        }else
        {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/login");
            })
        }
    })
})

app.get("/login",function(req, res) {
    res.render("login.ejs");
})

app.post("/login",passport.authenticate("local",{
    successRedirect:"/askquestion",
    failureRedirect:"/login"
}),function(req,res){
});

app.get("/askquestion",isLoggedIn,function(req, res) {
    var status=req.user;
    Question.find({}).populate("answerqueries").populate("questionqueries").exec(function(err,findquestion){
        if(err)
        {
            return console.log(err);
        }
        else
        {
            res.render("askquestion.ejs",{status:status,findquestion:findquestion});
        }
    })
    
})

app.get("/logout",function(req, res) {
    req.logout();
    res.redirect("/")
})

app.post("/addquestion",function(req, res) {
    var status=req.user;
    var user={
        id:req.user._id,
        username:req.user.username
    };
    var question=req.body.question;
    Question.create({question:question,user:user,date:new Date()},function(err,questioncreated)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            
            res.redirect("/askquestion");
        }
    })
})

app.get("/showquestion",function(req, res) {
    var status=req.user;
    Question.find({}).populate("answers").exec(function(err,findquestion){
        if(err)
        {
            return console.log(err);
        }
        else
        {
            
            res.render("showquestion.ejs",{findquestion:findquestion,status:status});
        }
    })
})

app.post("/submitanswer/:id",function(req, res) {
    var user={
        id:req.user._id,
        username:req.user.username
    };
    Question.findById({_id:req.params.id},function(err,questionfind)
    {
        if(err)
        {
            return console.log(err);
        }
        else
        {
            Answer.create({user:user,answer:req.body.answer,date:new Date()},function(err,answercreated)
        {
        if(err)
        {
            return console.log(err);
        }
        else{
            questionfind.answers.unshift(answercreated);
            questionfind.save();
            res.redirect("/showquestion");
        }
    })
        }
    })
})

app.post("/queryanswer/:id",function(req, res) {
    var user={
        id:req.user.id,
        username:req.user.userSchema
    }
    Question.findById({_id:req.params.id},function(err,questionfind){
        if(err)
        {
            return console.log(err);
        }
        else{
            AnswerQuery.create({answerquery:req.body.queryanswer,user:user,date:new Date()},function(err,answercreated)
            {
                if(err)
                {
                    return console.log(err);
                }
                else
                {
                    questionfind.answerqueries.unshift(answercreated);
                    questionfind.save();
                    res.redirect("/askquestion");
                }
            })
        }
    })
})

app.get("/info/:id",function(req, res){
    var status=req.user;
    Question.findById({_id:req.params.id}).populate("answers").populate("answerqueries").populate("questionqueries").exec(function(err,questioninfo)
    {
        if(err)
        {
            return console.log(err);
        }
        else
        {
            res.render("questioninfo.ejs",{questioninfo:questioninfo,status:status})
        }
    })
})

app.post("/info/query/:id",function(req, res) {
    var user={
        id:req.user.id,
        username:req.user.username
    }
    Question.findById({_id:req.params.id},function(err, questionfind) {
        if(err)
        {
            return console.log(err);
        }else{
            QuestionQuery.create({user:user,questionquery:req.body.questionquery,date:new Date()},function(err, questioncreated) {
        if(err){
            return console.log(err);
        }else
        {
            questionfind.questionqueries.shift(questioncreated);
            questionfind.save();
            res.redirect("/askquestion");
        }
    })
        }
    })
})

function isLoggedIn(req,res,next)
{
    if(req.isAuthenticated())
    {
        return next();
    }else{
        res.redirect("/login");
    }
}

function isLoggedOut(req,res,next)
{
    if(req.isAuthenticated())
    {
        res.redirect("/askquestion")
    }else{
        return next();
    }
}

app.listen(process.env.PORT,process.env.IP,function(){
    console.log("Server has started");
})