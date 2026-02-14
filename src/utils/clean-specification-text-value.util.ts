export function cleanSpecificationTextValue(text: string): string {
    const replacements: { [key: string]: string } = {
        "&nbsp": " ",
        "&gt": ">",
        "&lrm": "",
        "&amp": "&",
    }

    return text.replace(/&nbsp|&gt|&lrm|&amp/g, (match) => replacements[match]).trim()
}