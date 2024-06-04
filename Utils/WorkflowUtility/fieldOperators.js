const operators = require("./operators");

let fieldOperators = { "string": [], "text": [], "number": [], "date": [], "list": [], "multi-select": [], "radio": [] };

/*
* String Operators
*/
fieldOperators.string.push(operators.equal);
fieldOperators.string.push(operators.notEqual);
fieldOperators.string.push(operators.startsWith);
fieldOperators.string.push(operators.endsWith);
// fieldOperators.string.push(operators.in);
// fieldOperators.string.push(operators.notIn);
fieldOperators.string.push(operators.isNotNull);
fieldOperators.string.push(operators.isNull);

/*
* Text Operators
*/
fieldOperators.text.push(operators.equal);
fieldOperators.text.push(operators.notEqual);
fieldOperators.text.push(operators.startsWith);
fieldOperators.text.push(operators.endsWith);
fieldOperators.text.push(operators.isNotNull);
fieldOperators.text.push(operators.isNull);

/*
* Number Operators
*/
fieldOperators.number.push(operators.equal);
fieldOperators.number.push(operators.notEqual);
fieldOperators.number.push(operators.greaterThan);
fieldOperators.number.push(operators.lessThan);
fieldOperators.number.push(operators.between);
fieldOperators.number.push(operators.isNotNull);
fieldOperators.number.push(operators.isNull);

/*
* Date Operators
*/
fieldOperators.date.push(operators.equal);
fieldOperators.date.push(operators.notEqual);
fieldOperators.date.push(operators.isBefore);
fieldOperators.date.push(operators.isAfter);
fieldOperators.date.push(operators.between);
fieldOperators.date.push(operators.isNotNull);
fieldOperators.date.push(operators.isNull);

/*
* List Operators
*/
fieldOperators.list.push(operators.equal);
fieldOperators.list.push(operators.notEqual);
fieldOperators.list.push(operators.isNotNull);
fieldOperators.list.push(operators.isNull);

/*
* Multi-Select Operators
*/
fieldOperators["multi-select"].push(operators.equal);
fieldOperators["multi-select"].push(operators.notEqual);
fieldOperators["multi-select"].push(operators.contains);
fieldOperators["multi-select"].push(operators.notContains);
fieldOperators["multi-select"].push(operators.isNotNull);
fieldOperators["multi-select"].push(operators.isNull);

/*
* Radio Operators
*/
fieldOperators["radio"].push(operators.isNotNull);
fieldOperators["radio"].push(operators.isNull);


module.exports = fieldOperators;
