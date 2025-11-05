package com.example.myapplication.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.GridLayoutManager
import com.example.myapplication.databinding.FragmentHomeBinding
import com.example.myapplication.model.Product
import com.example.myapplication.ui.cart.CartViewModel

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private val cartViewModel: CartViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        val root: View = binding.root

        val products = listOf(
            Product("Bánh kem", "120.000 ₫", "Còn hàng", "https://via.placeholder.com/150"),
            Product("Nước Cam", "30.000 ₫", "Còn hàng", "https://via.placeholder.com/150"),
            Product("Bánh dâu", "150.000 ₫", "Còn hàng", "https://via.placeholder.com/150"),
            Product("Bánh tart trứng", "15.000 ₫", "Còn hàng", "https://via.placeholder.com/150"),
        )

        val productAdapter = ProductAdapter(products) { product ->
            cartViewModel.addProduct(product)
        }

        binding.recyclerViewProducts.apply {
            layoutManager = GridLayoutManager(context, 2)
            adapter = productAdapter
        }

        return root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}