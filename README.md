# README

see [seikichi/icfpc2017](https://github.com/seikichi/icfpc2017).

## Deploy

```
> heroku login
> heroku create
> heroku buildpacks:add --index 1 heroku/nodejs
> heroku config:add BASIC_AUTH_USERNAME="user" BASIC_AUTH_PASSWORD="password"
> git push heroku master
> heroku open
```
