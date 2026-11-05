package services.AdventureService.objects

import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.*

final case class ContentManifest(schemaVersion: Int, contentVersion: String, tileSize: Int, viewport: List[Int])
object ContentManifest:
  given Encoder[ContentManifest] = deriveEncoder
  given Decoder[ContentManifest] = deriveDecoder
