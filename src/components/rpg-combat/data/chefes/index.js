import malenia from './malenia.js';

export const CHEFES = [malenia];

export function buscarChefe(id) {
    return CHEFES.find((chefe) => chefe.id === id) || CHEFES[0];
}
