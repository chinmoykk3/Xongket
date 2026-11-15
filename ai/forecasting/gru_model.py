"""Optional PyTorch GRU Recurrent Model for Flood Time-Series Comparison.

If PyTorch is installed, this module provides a 2-layer Gated Recurrent Unit (GRU)
model for sequence-to-horizon water-level prediction. If PyTorch is not installed,
it gracefully reports unavailability and yields to the Scikit-Learn Gradient Boosting engine.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset

    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


def is_torch_available() -> bool:
    """Check whether PyTorch is installed in the current environment."""
    return HAS_TORCH


if HAS_TORCH:

    class FloodGRUModule(nn.Module):
        """2-Layer GRU with linear multi-horizon prediction head."""

        def __init__(self, input_dim: int, hidden_dim: int = 32, num_layers: int = 2):
            super().__init__()
            self.gru = nn.GRU(
                input_size=input_dim,
                hidden_size=hidden_dim,
                num_layers=num_layers,
                batch_first=True,
                dropout=0.1 if num_layers > 1 else 0.0,
            )
            self.fc = nn.Linear(hidden_dim, 3)  # Predict 1h, 3h, 6h directly

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            out, _ = self.gru(x)
            last_step = out[:, -1, :]
            return self.fc(last_step)


class OptionalGRUForecaster:
    """Wrapper that trains and evaluates a GRU model when PyTorch is available."""

    def __init__(self, sequence_length: int = 12, hidden_dim: int = 32):
        self.sequence_length = sequence_length
        self.hidden_dim = hidden_dim
        self.model: Optional[Any] = None

    def is_supported(self) -> bool:
        return HAS_TORCH

    def train_and_evaluate(
        self,
        X_train: Any,
        y_train: Any,
        X_val: Any,
        y_val: Any,
        epochs: int = 15,
        batch_size: int = 64,
    ) -> Dict[str, Any]:
        """Train GRU model if PyTorch is installed; return evaluation metrics."""
        if not HAS_TORCH:
            return {
                "available": False,
                "reason": "PyTorch is optional and not installed in this environment.",
                "horizons": {
                    1: {"mae": None, "rmse": None, "note": "PyTorch optional; skipped"},
                    3: {"mae": None, "rmse": None, "note": "PyTorch optional; skipped"},
                    6: {"mae": None, "rmse": None, "note": "PyTorch optional; skipped"},
                },
            }

        # PyTorch implementation
        device = torch.device("cpu")
        input_dim = X_train.shape[-1]
        self.model = FloodGRUModule(input_dim=input_dim, hidden_dim=self.hidden_dim).to(device)

        train_ds = TensorDataset(
            torch.tensor(X_train, dtype=torch.float32),
            torch.tensor(y_train, dtype=torch.float32),
        )
        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.005)

        self.model.train()
        for epoch in range(epochs):
            for batch_x, batch_y in train_loader:
                optimizer.zero_grad()
                preds = self.model(batch_x)
                loss = criterion(preds, batch_y)
                loss.backward()
                optimizer.step()

        # Evaluate
        self.model.eval()
        with torch.no_grad():
            val_x_t = torch.tensor(X_val, dtype=torch.float32).to(device)
            val_preds = self.model(val_x_t).cpu().numpy()

        results = {"available": True, "horizons": {}}
        horizons = [1, 3, 6]
        for idx, h in enumerate(horizons):
            actual = y_val[:, idx]
            pred = val_preds[:, idx]
            mae = float(np.mean(np.abs(actual - pred)))
            rmse = float(np.sqrt(np.mean((actual - pred) ** 2)))
            results["horizons"][h] = {"mae": round(mae, 2), "rmse": round(rmse, 2)}

        return results
