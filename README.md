## Agora graph based forum

To install run `meteor add agoraforum:core`

TODO

Refactoring/Debugging
* renderer: stop using post deletion hack
* make zoom bar cross-platform
* fix zoom bar first-frame bug (scale is a session variable)
* make zoom bar smooth
* fix posts not being deleted from partition properly
* simplify shared libraries
* arrange for error method when webGL or any other site component is unsupported.

Changes to Promote Usability
* Have some of the content from nodes display when the graph is further zoomed out.
* Allow linking to specific posts.
* Allow users to load posts and control the layout.
* camera subtree-relative updating
* show which posts have been read.
    * improve date format
* reply line (and maybe go to post button)
* improved styles (esp. buttons)
* Center graph
* Bookmarks

New Features
* Better moderation
    * Ability to hide posts, so that they don’t show up generally
    * Ability to lock posts, so that only moderators can respond to them.
* Moderator tracking
* Alerts
    * Voting
* SAA
* Federation
