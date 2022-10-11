Copyright 2021 HolyCorn Software

---------------------------------------------------
        Guidelines for html-hc v2 widgets
---------------------------------------------------


1) Each widget should contain all its data in an element of class 'container'

2) Widgets should call the super.prepare() method at the end of it's constructor

3) Widgets should be placed in folders, containing (in addition to it's files), an 'index.js' file, that exposes the parts of the module accordingly

4) It is advisable for style rules of widgets to be stored in css files bearing the name of the widget

5) Widgets should provide a help() function, that returns examples and guidelines of how to use the widget

6) Source codes should have comments explaining why the (major) choices are made.

7) The source code for widget.js (in the lib directory) should be checked regularly

8) Widgets should provide a quickAdd() function. For example the quickAdd() method of a form can allow the possibility to add many fields and buttons in a single function call

9) Data collection widgets (e.g forms, inputs) should have a value property, that returns the user input as a well formatted object

10) Its a good idea to split widgets into sub widgets

11) As much as possible, fire events when the states of widgets change

