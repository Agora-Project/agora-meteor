
Template.expandedPost.onRendered(function () {
    var instance = Template.instance();

    if(this.data.content)
        instance.$('.expanded-post-content').html(XBBCODE.process({
            text: this.data.content,
            removeMisalignedTags: false,
            addInLineBreaks: true
        }).html);

});
