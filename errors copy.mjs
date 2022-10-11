/*
Copyright 2021 HolyCorn Software
The reason for this module is because we don't want embarrassing errors to be displayed to our users.
Therefore, errrors that extend ExpectedError will be shown to the user. Every other case, we get 'Server Error'
*/


export class ExpectedError extends Error{}