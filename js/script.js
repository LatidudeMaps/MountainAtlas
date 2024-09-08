document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', event => {
    if (event.ctrlKey && (event.key === 'u' || event.key === 's')) {
        event.preventDefault();
        alert('Sorry, this action is not allowed.');
    }
});

console.log = function() {};
console.warn = function() {};
console.error = function() {};