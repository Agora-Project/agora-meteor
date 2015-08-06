Template.layout.events
  'click .button-post': ->
    Router.go('/post')
  'click .button-users': ->
    Router.go('/users')
  'click .button-home': ->
    Router.go('/');
  'click #at-nav-button': ->
    Router.go('/login');
