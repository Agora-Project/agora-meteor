Router.configure
  layoutTemplate: 'layout'

Router.route '/', ->
  this.render('graph')
  
Router.route '/post', ->
  this.render('post')
  
Router.route '/users', ->
  this.render('users')

Router.route '/login', ->
  this.render('login')
