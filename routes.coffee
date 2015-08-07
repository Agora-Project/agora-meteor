Router.onBeforeAction ->
  if (!Meteor.userId())
    this.render('login')
  else
    if Meteor.user().isBanned
      this.render('forbidden')
    else
      $('.mdl-layout__drawer').removeClass('is-visible')
      this.next()

Router.configure
  layoutTemplate: 'layout'

Router.route '/', ->
  this.render('graph')

Router.route '/post', ->
  this.render('post')

Router.route '/users', ->
  this.render('users')

Router.route '/account', ->
  this.render('account')

Router.route '/settings', ->
  this.render('settings')


Router.route '/login', ->
  this.render('login')
