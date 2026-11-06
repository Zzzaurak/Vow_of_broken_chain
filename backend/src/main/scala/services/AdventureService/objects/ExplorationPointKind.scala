package services.AdventureService.objects
import io.circe.{Encoder, Decoder}
enum ExplorationPointKind:
  case npc, sign, chest, camp, switch, breakable, bridge, book
object ExplorationPointKind:
  given Encoder[ExplorationPointKind] = Encoder.encodeString.contramap(_.toString)
  given Decoder[ExplorationPointKind] = Decoder.decodeString.emap(value => values.find(_.toString == value).toRight(s"Unsupported ExplorationPointKind: $value"))
