
Meteor.setInterval(function() {
    Posts.update({recentActivity: { $gt: 0 }} , { $inc: {recentActivity: -1}});
}, 1000*60*60); //Run every hour
