
Meteor.setInterval(function() {
    Posts.update({recentActivity: {$gt: 0}}, {$inc: {recentActivity: -1}}, {multi: true});
}, 1000*60*5); //Run every five minutes
