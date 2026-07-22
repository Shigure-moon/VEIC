const OPENING_PHRASE = 'Every state. Every action. Every observation.'
const OPENING_WORDS = OPENING_PHRASE.split(' ')

export function OpeningSplash() {
  return (
    <div className="veic-opening-splash" aria-hidden="true">
      <div className="veic-opening-sequence">
        <h2>
          {OPENING_WORDS.map((word, wordIndex) => (
            <span className={`word${wordIndex + 1}`} key={`${word}-${wordIndex}`}>
              {[...word].map((letter, letterIndex) => (
                <span className={`letter${letterIndex + 1}`} key={`${letter}-${letterIndex}`}>
                  <span>{letter}</span>
                </span>
              ))}
            </span>
          ))}
        </h2>
      </div>
    </div>
  )
}
