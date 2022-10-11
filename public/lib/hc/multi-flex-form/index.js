/**
Copyright 2021 HolyCorn Software
The MultiFlexForm Widget
At the very least, this widget is a form that is capable of multiple input types, controlled by input fields
For more information for getting a range of inputs such as date, drop down, email, password, check the MultiFlexFormField
class documentation. Note that the input fields provided here allow the possibility of labeling, whereby a beautiful piece
of text is attached to the input field. This text swipes upwards once the user wants to make an input, and returns to it's
place once the user has cleared the input field

This widget also allows a form that can change shape and sizes according to demand, and user input
For example it is well applicable in developing a login,signup,reset form, all in one.
It allows for the possibility whereby a user clicks a button and then the form changes the active input fields by
swapping them for the ones that are on the waiting list.
For example, swap the password field for a user name field, or at best, simply remove the password field
The advantage of this widget is the ease and the user experience during the swap process.
The animation is smooth and doesn't break the layout.
More information by checking the MultiFlexForm and MultiFlexFormItem source codes.

To simplify the addition and removal of fields, the MultiFexFormConfiguration class is created. It allows developers to
create configurations of how fields and rows are bound to each other. These configurations are reusable.
A configuration for example could be a 'login' configuration whereby the email and password fields are visible
Then another configuration is created, called the 'reset' configuration, whereby only the email field is visible
The login configuration can be applied to the form. Then when the user clicks the 'reset password' button, the reset configuration
is then applied to the form
More information by checking the source code of MultiFlexFormConfiguration

*/

import { MultiFlexForm } from "./flex.js";
import { MultiFlexFormConfiguration } from "./config.js";
import { MultiFlexFormField } from "./field.js";
import { MultiFlexFormItem } from "./item.js";

//A simple container that adds everything horizontally, but wraps them around when space is limited
import { MultiFlexFormRow } from "./row.js"; 

export {MultiFlexForm, MultiFlexFormField, MultiFlexFormRow, MultiFlexFormConfiguration, MultiFlexFormItem}