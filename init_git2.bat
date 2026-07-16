@echo off
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" config user.email "user.rakesh1@gmail.com"
"C:\Program Files\Git\cmd\git.exe" config user.name "Rakesh"
"C:\Program Files\Git\cmd\git.exe" rm -r --cached node_modules
"C:\Program Files\Git\cmd\git.exe" rm -r --cached app\backend\node_modules
"C:\Program Files\Git\cmd\git.exe" rm -r --cached app\frontend\node_modules
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Prepare for production deploy"
