

export function capitaliseFirst(string){
    if (!string){
        return '';
    }
    return string[0].toUpperCase() + string.slice(1);
}


export function spacedAtCapitals(string, capitaliseFirstLetter){
    let spacedString = '';
    for (let i = 0; i < string.length; ++i){
        const c = (i === 0 && capitaliseFirstLetter) ? string[i].toUpperCase() : string[i];
        if (i !== 0 && c.toUpperCase() === c){
            spacedString += ' ';
        }
        spacedString += c;
    }
    return spacedString;
}


export function getParentBySelector(startElement, selector) {
    let currentElm = startElement;
    while (currentElm != document.body) {
        if (currentElm.matches(selector)) { 
            return currentElm; 
        }
        currentElm = currentElm.parentElement;
    }
}

export function createHrefForJsonString(jsonString){
    const file = new Blob([jsonString], {type: 'application/json'});
    return URL.createObjectURL(file);
}

export async function waitMs(ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, ms);
    });
}


export function clearElementHtml(element){
    //todo: find out which of these is faster
    //element.innerHTML = '';
    while (element.firstChild){
        element.removeChild(element.firstChild);
    }
}


//https://stackoverflow.com/questions/5767325/how-can-i-remove-a-specific-item-from-an-array
export function removeArrayItemOnce(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
  }

//https://stackoverflow.com/questions/5767325/how-can-i-remove-a-specific-item-from-an-array
export function removeArrayItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}

