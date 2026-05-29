export const QUOTES = {
  Warrior: [
    { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
    { text: "If it is not right, do not do it; if it is not true, do not say it.", author: "Marcus Aurelius" },
    { text: "The first rule is to keep an untroubled spirit. The second is to look things in the face and know them for what they are.", author: "Marcus Aurelius" },
    { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
    { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", author: "Marcus Aurelius" },
    { text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present.", author: "Marcus Aurelius" },
    { text: "Do not indulge in dreams of having what you have not, but count your present blessings and thank the gods for them.", author: "Marcus Aurelius" },
    { text: "When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous and surly.", author: "Marcus Aurelius" },
  ],
  Mage: [
    { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus" },
    { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
    { text: "Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.", author: "Epictetus" },
    { text: "First say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
    { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
    { text: "Men are disturbed not by things, but by their opinions about things.", author: "Epictetus" },
    { text: "We have two ears and one mouth so that we can listen twice as much as we speak.", author: "Epictetus" },
    { text: "No man is free who is not master of himself.", author: "Epictetus" },
    { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus" },
    { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  ],
  Rogue: [
    { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
    { text: "It is not that I'm so smart. But I stay with the questions much longer.", author: "Seneca" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
    { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
    { text: "The whole future lies in uncertainty: live immediately.", author: "Seneca" },
    { text: "It is not the man who has too little, but the man who craves more, that is poor.", author: "Seneca" },
    { text: "He who is brave is free.", author: "Seneca" },
    { text: "Omnia, Lucili, aliena sunt, tempus tantum nostrum est. — Everything is alien to us, Lucilius; time alone is ours.", author: "Seneca" },
    { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
  ],
}

export function getDailyQuote(characterClass) {
  const quotes = QUOTES[characterClass] || QUOTES.Warrior
  const day = new Date().getDate()
  return quotes[day % quotes.length]
}
