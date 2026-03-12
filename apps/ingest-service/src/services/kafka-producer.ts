import { Kafka, type Producer } from "kafkajs";
import { config } from "../config.js";

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
  });

  producer = kafka.producer();
  await producer.connect();
  console.log("[kafka] Producer connected");
  return producer;
}

export async function sendToKafka(
  topic: string,
  messages: Array<{ key?: string; value: string }>
): Promise<void> {
  const p = await getProducer();
  await p.send({ topic, messages });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
