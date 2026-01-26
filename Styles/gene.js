
        const geneElement = document.querySelector('.gene');
        const geneContentElement = document.querySelector('.gene__content');
        const increaseHeightBtn = document.querySelector('.gene__btn');

increaseHeightBtn.addEventListener('click', () => {
    const currentHeight = parseFloat(geneElement.style.height);

    if (currentHeight === 870) {
        geneElement.style.height = '50px';
        geneContentElement.style.height = '0px';
    } else {
        geneElement.style.height = '870px';
        geneContentElement.style.height = '870px';
    }
});