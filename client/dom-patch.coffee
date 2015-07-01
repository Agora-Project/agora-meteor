#Meteor.startup ->
##window.addEventListener "WebComponentsReady", ->
##_.each document.querySelectorAll('[icon]'), (icon) ->
##icon._updateIcon() if typeof icon._updateIcon is 'function'
#
#  ready = new ReactiveVar false
#  window.addEventListener "WebComponentsReady", ->
#    ready.set true
#
#  render = Blaze.render
#  Blaze.render = ->
#    renderArgs = arguments
#    Tracker.autorun =>
#      if ready.get()
#        render.apply(@, renderArgs)
#        ready.set false
#
#  destroyNode = Blaze._destroyNode
#  Blaze._destroyNode = ->
#    node = arguments[0]
#    destroyNode.apply(@, arguments)
#    node.offsetParent.removeChild(node)