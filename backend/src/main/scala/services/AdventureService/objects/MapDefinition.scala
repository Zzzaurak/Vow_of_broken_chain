package services.AdventureService.objects

import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*

final case class MapDefinition(id: String, name: String, width: Int, height: Int, spawn: List[Double], exit: List[Double], next: Option[String], obstacles: List[List[Double]], before: Option[String], encounter: Option[String], after: Option[String], checkpoint: String, unlock: Option[Partner], finalPreparation: Boolean, objective: String)
object MapDefinition:
  given Encoder[MapDefinition] = deriveEncoder
  given Decoder[MapDefinition] = deriveDecoder
