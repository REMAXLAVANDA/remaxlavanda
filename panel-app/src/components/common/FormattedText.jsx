import { parseFormattedBlocks, parseInlineBold } from '../../lib/formattedText'

function Inline({ text }) {
  return parseInlineBold(text).map((segment) =>
    segment.bold ? <strong key={segment.key}>{segment.text}</strong> : <span key={segment.key}>{segment.text}</span>,
  )
}

// doc.contentText'i (Rehber dokümanları + SSS cevapları) basit
// biçimlendirmeyle basar — bkz. lib/formattedText.js. Eskiden her yerde
// whitespace-pre-line ile düz metin basılıyordu, artık "**kalın**", "- "
// madde işareti ve "# " başlık da destekleniyor.
export default function FormattedText({ text, className = '' }) {
  const blocks = parseFormattedBlocks(text)
  return (
    <div className={`space-y-1.5 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <ul key={index} className="list-disc space-y-0.5 pl-4">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'heading') {
          return (
            <p key={index} className="font-semibold text-text-primary">
              <Inline text={block.text} />
            </p>
          )
        }
        return (
          <p key={index} className="whitespace-pre-line">
            <Inline text={block.text} />
          </p>
        )
      })}
    </div>
  )
}
