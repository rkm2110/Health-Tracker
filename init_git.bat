@echo off
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" config user.email "user.rakesh1@gmail.com"
"C:\Program Files\Git\cmd\git.exe" config user.name "Rakesh"
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Prepare for production deploy"
