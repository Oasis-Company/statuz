import requests
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Signal:
    type: str
    source: str
    payload: Dict[str, Any]
    id: Optional[str] = None
    target: Optional[str] = None
    receivedAt: Optional[str] = None


@dataclass
class SynRequest:
    requester: str
    type: str
    description: str
    priority: str
    id: Optional[str] = None
    status: Optional[str] = None
    createdAt: Optional[str] = None


@dataclass
class SignalResponse:
    success: bool
    signal: Optional[Signal] = None
    signals: Optional[List[Signal]] = None


@dataclass
class SynResponse:
    success: bool
    request: Optional[SynRequest] = None
    requests: Optional[List[SynRequest]] = None


class CoordinationClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url

    def send_signal(self, signal: Signal) -> Signal:
        payload = {
            "type": signal.type,
            "source": signal.source,
            "payload": signal.payload
        }
        if signal.target:
            payload["target"] = signal.target

        response = requests.post(
            f"{self.base_url}/api/v1/signals",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        if not response.ok:
            raise Exception(f"Failed to send signal: {response.status_text}")

        result = response.json()
        if not result.get("success") or not result.get("signal"):
            raise Exception("Failed to send signal: invalid response")

        signal_data = result["signal"]
        return Signal(
            id=signal_data.get("id"),
            type=signal_data["type"],
            source=signal_data["source"],
            target=signal_data.get("target"),
            payload=signal_data["payload"],
            receivedAt=signal_data.get("receivedAt")
        )

    def get_signals(self) -> List[Signal]:
        response = requests.get(f"{self.base_url}/api/v1/signals")

        if not response.ok:
            raise Exception(f"Failed to get signals: {response.status_text}")

        result = response.json()
        if not result.get("success") or not result.get("signals"):
            raise Exception("Failed to get signals: invalid response")

        signals = []
        for signal_data in result["signals"]:
            signals.append(Signal(
                id=signal_data.get("id"),
                type=signal_data["type"],
                source=signal_data["source"],
                target=signal_data.get("target"),
                payload=signal_data["payload"],
                receivedAt=signal_data.get("receivedAt")
            ))

        return signals

    def create_syn_request(self, request: SynRequest) -> SynRequest:
        payload = {
            "requester": request.requester,
            "type": request.type,
            "description": request.description,
            "priority": request.priority
        }

        response = requests.post(
            f"{self.base_url}/api/v1/syn/requests",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        if not response.ok:
            raise Exception(f"Failed to create SYN request: {response.status_text}")

        result = response.json()
        if not result.get("success") or not result.get("request"):
            raise Exception("Failed to create SYN request: invalid response")

        request_data = result["request"]
        return SynRequest(
            id=request_data.get("id"),
            requester=request_data["requester"],
            type=request_data["type"],
            description=request_data["description"],
            priority=request_data["priority"],
            status=request_data.get("status"),
            createdAt=request_data.get("createdAt")
        )

    def get_syn_requests(self) -> List[SynRequest]:
        response = requests.get(f"{self.base_url}/api/v1/syn/requests")

        if not response.ok:
            raise Exception(f"Failed to get SYN requests: {response.status_text}")

        result = response.json()
        if not result.get("success") or not result.get("requests"):
            raise Exception("Failed to get SYN requests: invalid response")

        syn_requests = []
        for request_data in result["requests"]:
            syn_requests.append(SynRequest(
                id=request_data.get("id"),
                requester=request_data["requester"],
                type=request_data["type"],
                description=request_data["description"],
                priority=request_data["priority"],
                status=request_data.get("status"),
                createdAt=request_data.get("createdAt")
            ))

        return syn_requests
