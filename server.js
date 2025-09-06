const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));
const SCORES_FILE = path.join(__dirname,'scores.json');
function readScores(){ try{return JSON.parse(fs.readFileSync(SCORES_FILE,'utf8'));}catch(e){return [];} }
function writeScores(scores){ fs.writeFileSync(SCORES_FILE, JSON.stringify(scores)); }
app.get('/api/scores',(req,res)=>{ res.json(readScores().sort((a,b)=>a.time-b.time).slice(0,10)); });
app.post('/api/scores',(req,res)=>{ const {name,time}=req.body||{}; if(typeof name!=='string'||typeof time!=='number'){ return res.status(400).json({error:'invalid'});} const scores=readScores(); scores.push({name,time}); writeScores(scores); res.json({status:'ok'}); });
const PORT=process.env.PORT||3000; app.listen(PORT,()=>console.log('Server running on '+PORT));
