'use client';

import { useState } from 'react';

export default function Home() {
  const [selectedService, setSelectedService] = useState('openai');
  const [copied, setCopied] = useState(false);

  const workflow = {
    name: "WhatsApp Audio Transcription",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "whatsapp-webhook",
          responseMode: "responseNode",
          options: {}
        },
        id: "webhook-node",
        name: "WhatsApp Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [250, 300],
        webhookId: "whatsapp-audio-webhook"
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              typeValidation: "strict"
            },
            conditions: [
              {
                id: "audio-check",
                leftValue: "={{ $json.message.type }}",
                rightValue: "audio",
                operator: {
                  type: "string",
                  operation: "equals"
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        id: "if-audio",
        name: "Check if Audio",
        type: "n8n-nodes-base.if",
        typeVersion: 2,
        position: [450, 300]
      },
      {
        parameters: {
          url: "={{ $json.message.audio.url }}",
          options: {
            response: {
              response: {
                responseFormat: "file"
              }
            }
          }
        },
        id: "download-audio",
        name: "Download Audio File",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [650, 200]
      },
      ...(selectedService === 'openai' ? [
        {
          parameters: {
            resource: "audio",
            operation: "transcribe",
            binaryPropertyName: "data",
            options: {
              language: "en",
              temperature: 0
            }
          },
          id: "openai-whisper",
          name: "OpenAI Whisper Transcription",
          type: "n8n-nodes-base.openAi",
          typeVersion: 1.3,
          position: [850, 200],
          credentials: {
            openAiApi: {
              id: "1",
              name: "OpenAI API"
            }
          }
        }
      ] : selectedService === 'assemblyai' ? [
        {
          parameters: {
            operation: "transcribe",
            binaryPropertyName: "data",
            options: {
              languageCode: "en"
            }
          },
          id: "assemblyai",
          name: "AssemblyAI Transcription",
          type: "n8n-nodes-base.assemblyAi",
          typeVersion: 1,
          position: [850, 200],
          credentials: {
            assemblyAiApi: {
              id: "2",
              name: "AssemblyAI API"
            }
          }
        }
      ] : [
        {
          parameters: {
            resource: "speech",
            operation: "recognize",
            binaryPropertyName: "data",
            options: {
              languageCode: "en-US"
            }
          },
          id: "google-speech",
          name: "Google Speech-to-Text",
          type: "n8n-nodes-base.googleCloudSpeechToText",
          typeVersion: 1,
          position: [850, 200],
          credentials: {
            googleCloudSpeechToTextOAuth2Api: {
              id: "3",
              name: "Google Cloud STT"
            }
          }
        }
      ]),
      {
        parameters: {
          method: "POST",
          url: "={{ $json.callback_url || 'YOUR_WHATSAPP_API_URL' }}",
          sendBody: true,
          bodyParameters: {
            parameters: [
              {
                name: "phone",
                value: "={{ $('WhatsApp Webhook').item.json.from }}"
              },
              {
                name: "message",
                value: "={{ $json.text || $json.transcript }}"
              },
              {
                name: "originalAudioId",
                value: "={{ $('WhatsApp Webhook').item.json.message.audio.id }}"
              }
            ]
          },
          options: {}
        },
        id: "send-response",
        name: "Send Transcription Back",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [1050, 200]
      },
      {
        parameters: {
          respondWith: "json",
          responseBody: "={{ { success: true, transcription: $json.text || $json.transcript } }}"
        },
        id: "respond-webhook",
        name: "Respond to Webhook",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [1250, 200]
      },
      {
        parameters: {
          respondWith: "json",
          responseBody: "={{ { error: 'Not an audio message' } }}",
          options: {
            responseCode: 400
          }
        },
        id: "respond-error",
        name: "Not Audio Response",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [650, 400]
      }
    ],
    connections: {
      "WhatsApp Webhook": {
        main: [
          [
            {
              node: "Check if Audio",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Check if Audio": {
        main: [
          [
            {
              node: "Download Audio File",
              type: "main",
              index: 0
            }
          ],
          [
            {
              node: "Not Audio Response",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Download Audio File": {
        main: [
          [
            {
              node: selectedService === 'openai' ? "OpenAI Whisper Transcription" : selectedService === 'assemblyai' ? "AssemblyAI Transcription" : "Google Speech-to-Text",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      ...(selectedService === 'openai' ? {
        "OpenAI Whisper Transcription": {
          main: [
            [
              {
                node: "Send Transcription Back",
                type: "main",
                index: 0
              }
            ]
          ]
        }
      } : selectedService === 'assemblyai' ? {
        "AssemblyAI Transcription": {
          main: [
            [
              {
                node: "Send Transcription Back",
                type: "main",
                index: 0
              }
            ]
          ]
        }
      } : {
        "Google Speech-to-Text": {
          main: [
            [
              {
                node: "Send Transcription Back",
                type: "main",
                index: 0
              }
            ]
          ]
        }
      }),
      "Send Transcription Back": {
        main: [
          [
            {
              node: "Respond to Webhook",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    },
    pinData: {},
    settings: {
      executionOrder: "v1"
    },
    staticData: null,
    tags: [],
    triggerCount: 0,
    updatedAt: new Date().toISOString(),
    versionId: "1"
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-audio-transcription-${selectedService}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          WhatsApp Audio Transcription
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '40px',
          fontSize: '1.1rem'
        }}>
          n8n Workflow Generator
        </p>

        <div style={{
          background: '#f8f9fa',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            marginBottom: '20px',
            color: '#333'
          }}>
            Select Transcription Service
          </h2>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {[
              { id: 'openai', name: 'OpenAI Whisper', desc: 'Most accurate, supports 99 languages' },
              { id: 'assemblyai', name: 'AssemblyAI', desc: 'Fast and reliable' },
              { id: 'google', name: 'Google Speech-to-Text', desc: 'Enterprise-grade' }
            ].map(service => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '20px',
                  border: selectedService === service.id ? '3px solid #667eea' : '2px solid #ddd',
                  borderRadius: '12px',
                  background: selectedService === service.id ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>
                  {service.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {service.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          background: '#f8f9fa',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            marginBottom: '15px',
            color: '#333'
          }}>
            Workflow Features
          </h2>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            {[
              'Receives WhatsApp webhook with audio messages',
              'Validates incoming message is audio type',
              'Downloads audio file automatically',
              `Transcribes using ${selectedService === 'openai' ? 'OpenAI Whisper' : selectedService === 'assemblyai' ? 'AssemblyAI' : 'Google Speech-to-Text'}`,
              'Sends transcription back via WhatsApp API',
              'Returns JSON response to webhook caller',
              'Error handling for non-audio messages'
            ].map((feature, i) => (
              <li key={i} style={{
                padding: '12px 0',
                borderBottom: i < 6 ? '1px solid #e0e0e0' : 'none',
                color: '#555',
                fontSize: '0.95rem'
              }}>
                <span style={{ color: '#667eea', marginRight: '10px', fontWeight: 'bold' }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            marginBottom: '10px',
            color: '#856404'
          }}>
            Setup Instructions
          </h3>
          <ol style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#856404',
            fontSize: '0.9rem'
          }}>
            <li style={{ marginBottom: '8px' }}>Download the workflow JSON file below</li>
            <li style={{ marginBottom: '8px' }}>Import into n8n (Settings → Import from File)</li>
            <li style={{ marginBottom: '8px' }}>Configure {selectedService === 'openai' ? 'OpenAI API' : selectedService === 'assemblyai' ? 'AssemblyAI API' : 'Google Cloud'} credentials</li>
            <li style={{ marginBottom: '8px' }}>Update the "Send Transcription Back" node with your WhatsApp API URL</li>
            <li style={{ marginBottom: '8px' }}>Activate the workflow</li>
            <li>Copy the webhook URL and configure it in your WhatsApp Business API</li>
          </ol>
        </div>

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '15px 40px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            ⬇ Download Workflow
          </button>

          <button
            onClick={handleCopy}
            style={{
              padding: '15px 40px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#667eea',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f0f4ff';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'white';
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy JSON'}
          </button>
        </div>

        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#e8f5e9',
          borderRadius: '12px',
          border: '2px solid #4caf50'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            marginBottom: '10px',
            color: '#2e7d32'
          }}>
            Workflow Details
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#2e7d32' }}>
            <strong>Total Nodes:</strong> {workflow.nodes.length}<br/>
            <strong>Service:</strong> {selectedService === 'openai' ? 'OpenAI Whisper API' : selectedService === 'assemblyai' ? 'AssemblyAI' : 'Google Cloud Speech-to-Text'}<br/>
            <strong>Trigger:</strong> Webhook (HTTP POST)<br/>
            <strong>Format:</strong> n8n Workflow JSON v1
          </div>
        </div>
      </div>
    </div>
  );
}
